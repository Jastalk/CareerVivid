
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin, Linkedin, Globe, Star } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { inkOn, readableAccent } from '../../utils/templateInk';

export const VibrantTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="flex min-h-full bg-white" style={bodyStyle}>
      <aside className="w-1/3 text-white p-8" style={{backgroundColor: themeColor, color: inkOn(themeColor)}}>
        {personalDetails.photo && (
          <div className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-white overflow-hidden flex items-center justify-center">
            <img src={personalDetails.photo} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="text-center">
            <div className="flex justify-center gap-2 flex-wrap">
                <InlineEdit 
                    value={personalDetails.firstName} 
                    fieldId="personalDetails.firstName" 
                    onFocus={onFocus} 
                    className="text-3xl font-bold" 
                    style={titleStyle}
                    tagName="h1"
                    placeholder="First Name"
                />
                <InlineEdit 
                    value={personalDetails.lastName} 
                    fieldId="personalDetails.lastName" 
                    onFocus={onFocus} 
                    className="text-3xl font-bold" 
                    style={titleStyle}
                    tagName="h1"
                    placeholder="Last Name"
                />
            </div>
            <InlineEdit 
                value={personalDetails.jobTitle} 
                fieldId="personalDetails.jobTitle" 
                onFocus={onFocus} 
                className="text-md mt-1 block" 
                style={{color: 'rgba(255,255,255,0.8)'}}
                tagName="p"
                placeholder="Job Title"
            />
        </div>
        
        <hr className="my-6" style={{borderColor: 'rgba(255,255,255,0.3)'}} />

        <section className="mb-6">
          <h2 className="text-lg font-semibold uppercase tracking-wider mb-3" style={titleStyle}>Contact</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center break-all">
                <Mail size={14} className="mr-3 shrink-0 transform translate-y-px" />
                <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
            </div>
            <div className="flex items-center">
                <Phone size={14} className="mr-3 shrink-0 transform translate-y-px" />
                <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold uppercase tracking-wider mb-3" style={titleStyle}>Skills</h2>
          <ul className="space-y-1">
            {skills.map((skill, index) => (
              <li key={skill.id} className="text-sm">
                  <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <main className="w-2/3 p-8">
        <section className="mb-6">
          <h2 className="text-2xl font-bold border-b-2 pb-2 mb-3" style={{...titleStyle, color: readableAccent(themeColor), borderColor: `${themeColor}40`}}>Summary</h2>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-relaxed text-gray-700 block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-bold border-b-2 pb-2 mb-3" style={{...titleStyle, color: readableAccent(themeColor), borderColor: `${themeColor}40`}}>Experience</h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-4">
              <div className="flex justify-between items-baseline">
                <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-lg font-bold text-gray-800 block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Job Title"
                />
                <div className="flex gap-1 text-sm font-medium text-gray-600">
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <InlineEdit 
                value={job.employer} 
                fieldId={`employmentHistory[${index}].employer`} 
                onFocus={onFocus} 
                className="text-md italic text-gray-600 block" 
                tagName="p"
                placeholder="Employer"
              />
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-sm mt-1 leading-relaxed whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>
        
        <section>
          <h2 className="text-2xl font-bold border-b-2 pb-2 mb-3" style={{...titleStyle, color: readableAccent(themeColor), borderColor: `${themeColor}40`}}>Education</h2>
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
                className="text-md italic text-gray-600 block" 
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
