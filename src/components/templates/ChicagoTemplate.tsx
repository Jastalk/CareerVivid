
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const ChicagoTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };
  const themeColorStyle = { color: readableAccent(themeColor) };

  return (
    <div className="p-10 text-gray-800 bg-white" style={bodyStyle}>
      <header className="text-center mb-6">
        <div className="flex justify-center gap-2">
            <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-4xl font-bold tracking-widest uppercase" 
                style={titleStyle}
                tagName="h1"
                placeholder="FIRST NAME"
            />
            <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-4xl font-bold tracking-widest uppercase" 
                style={titleStyle}
                tagName="h1"
                placeholder="LAST NAME"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-xl font-light tracking-wider mt-2 block" 
            style={{...titleStyle, ...themeColorStyle}}
            tagName="h2"
            placeholder="Job Title"
        />
      </header>

      <div className="flex justify-center items-center flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mb-6 border-y-2 border-gray-800 py-2">
        <div className="flex items-center"><Mail size={14} className="mr-2 flex-shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" /></div>
        <div className="flex items-center"><Phone size={14} className="mr-2 flex-shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" /></div>
        <div className="flex items-center">
            <MapPin size={14} className="mr-2 flex-shrink-0 transform translate-y-px" />
            <InlineEdit value={personalDetails.city} fieldId="personalDetails.city" onFocus={onFocus} placeholder="City" />
            <span>, </span>
            <InlineEdit value={personalDetails.country} fieldId="personalDetails.country" onFocus={onFocus} placeholder="Country" />
        </div>
        {websites.map((site, index) => (
            <div key={site.id} className="flex items-center">
                {site.label.toLowerCase().includes('linkedin') ? <Linkedin size={14} className="mr-2 flex-shrink-0 transform translate-y-px" /> : <Globe size={14} className="mr-2 flex-shrink-0 transform translate-y-px" />}
                <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    <InlineEdit value={site.url} fieldId={`websites[${index}].url`} onFocus={onFocus} isLink />
                </a>
            </div>
        ))}
      </div>

      <main className="grid grid-cols-3 gap-10">
        <div className="col-span-2">
          <section className="mb-8">
            <h3 className="text-sm font-bold border-b-2 border-gray-300 pb-1 mb-3 tracking-widest" style={titleStyle}>PROFESSIONAL SUMMARY</h3>
            <InlineEdit 
                value={professionalSummary} 
                fieldId="professionalSummary" 
                onFocus={onFocus} 
                className="text-sm leading-relaxed block whitespace-pre-wrap"
                tagName="p"
                placeholder="Summary..."
            />
          </section>

          <section>
            <h3 className="text-sm font-bold border-b-2 border-gray-300 pb-1 mb-3 tracking-widest" style={titleStyle}>WORK EXPERIENCE</h3>
            {employmentHistory.map((job, index) => (
              <div key={job.id} className="mb-5">
                <div className="flex justify-between items-baseline">
                  <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-lg font-semibold block" 
                    style={titleStyle}
                    tagName="h4"
                    placeholder="Job Title"
                  />
                  <div className="flex gap-1 text-xs text-gray-600 font-medium">
                      <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                      <span>-</span>
                      <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                  </div>
                </div>
                <div className="flex gap-1 text-sm italic text-gray-700">
                    <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                    <span>,</span>
                    <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
                </div>
                <InlineEdit 
                    value={job.description} 
                    fieldId={`employmentHistory[${index}].description`} 
                    onFocus={onFocus} 
                    className="text-sm mt-2 leading-relaxed whitespace-pre-wrap block"
                    tagName="p"
                    placeholder="Description..."
                />
              </div>
            ))}
          </section>
        </div>

        <div className="col-span-1 pl-6 border-l border-gray-200">
          <section className="mb-8">
            <h3 className="text-sm font-bold border-b-2 border-gray-300 pb-1 mb-3 tracking-widest" style={titleStyle}>SKILLS</h3>
            <ul className="list-none space-y-1">
              {skills.map((skill, index) => (
                <li key={skill.id} className="text-sm">
                    <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-bold border-b-2 border-gray-300 pb-1 mb-3 tracking-widest" style={titleStyle}>EDUCATION</h3>
            {education.map((edu, index) => (
              <div key={edu.id} className="mb-4">
                <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="text-lg font-semibold block" 
                    style={titleStyle}
                    tagName="h4"
                    placeholder="Degree"
                />
                <InlineEdit 
                    value={edu.school} 
                    fieldId={`education[${index}].school`} 
                    onFocus={onFocus} 
                    className="text-sm italic block" 
                    tagName="p"
                    placeholder="School"
                />
                <div className="flex gap-1 text-xs text-gray-600 mt-1">
                    <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
};
