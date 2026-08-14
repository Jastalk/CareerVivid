
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { safeUrl } from '../../utils/safeUrl';
import { readableBorder } from '../../utils/templateInk';

export const SlateTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="flex min-h-full bg-white" style={bodyStyle}>
      <aside className="w-1/3 bg-slate-700 text-white p-8">
        {personalDetails.photo && (
          <div className="w-32 h-32 rounded-full mx-auto mb-6 overflow-hidden flex items-center justify-center">
            <img src={personalDetails.photo} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
        <section className="mb-8">
          <h2 className="text-xl font-bold border-b-2 pb-2 mb-4" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>CONTACT</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
                <Mail size={16} className="mr-3 flex-shrink-0 transform translate-y-px" />
                <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
            </div>
            <div className="flex items-center">
                <Phone size={16} className="mr-3 flex-shrink-0 transform translate-y-px" />
                <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
            </div>
            {websites.map((site, index) => (
              <div key={site.id} className="flex items-center">
                  <Globe size={16} className="mr-3 flex-shrink-0 transform translate-y-px" />
                  <a href={safeUrl(site.url)} className="hover:text-slate-300 break-all">
                      <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
                  </a>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-bold border-b-2 pb-2 mb-4" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>SKILLS</h2>
          <ul className="space-y-2 text-sm">
            {skills.map((skill, index) => (
              <li key={skill.id}>
                  <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <main className="w-2/3 p-10">
        <header className="mb-10">
          <div className="flex gap-3 items-end">
              <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-5xl font-extrabold text-slate-800" 
                style={titleStyle}
                tagName="h1"
                placeholder="First Name"
              />
              <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-5xl font-extrabold text-slate-800" 
                style={titleStyle}
                tagName="h1"
                placeholder="Last Name"
              />
          </div>
          <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-2xl font-light text-slate-600 mt-2 block" 
            style={titleStyle}
            tagName="p"
            placeholder="Job Title"
          />
        </header>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 border-b-4 pb-2 mb-4" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>PROFILE</h2>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-relaxed text-gray-700 block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 border-b-4 pb-2 mb-4" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>EXPERIENCE</h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-6">
              <InlineEdit 
                value={job.jobTitle} 
                fieldId={`employmentHistory[${index}].jobTitle`} 
                onFocus={onFocus} 
                className="text-lg font-bold text-gray-900 block" 
                style={titleStyle}
                tagName="h3"
                placeholder="Job Title"
              />
              <div className="text-md italic text-gray-700 mb-2 flex gap-1">
                  <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                  <span>|</span>
                  <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                  <span>-</span>
                  <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
              </div>
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>
        
        <section>
          <h2 className="text-2xl font-bold text-slate-800 border-b-4 pb-2 mb-4" style={{...titleStyle, borderColor: readableBorder(themeColor)}}>EDUCATION</h2>
          {education.map((edu, index) => (
            <div key={edu.id} className="mb-4">
              <InlineEdit 
                value={edu.degree} 
                fieldId={`education[${index}].degree`} 
                onFocus={onFocus} 
                className="font-bold text-lg block" 
                style={titleStyle}
                tagName="h3"
                placeholder="Degree"
              />
              <InlineEdit 
                value={edu.school} 
                fieldId={`education[${index}].school`} 
                onFocus={onFocus} 
                className="text-md italic text-gray-700 block" 
                tagName="p"
                placeholder="School"
              />
              <div className="flex gap-1 text-sm text-gray-600">
                  <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                  <span>-</span>
                  <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};
